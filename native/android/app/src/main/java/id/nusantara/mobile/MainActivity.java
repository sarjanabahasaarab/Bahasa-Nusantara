package id.nusantara.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

/** Minimal native host used to verify Android packaging and lifecycle in CI. */
public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        TextView label = new TextView(this);
        label.setText("NUSANTARA Mobile Native Host");
        label.setTextSize(20f);
        label.setGravity(Gravity.CENTER);
        setContentView(label);
    }
}
